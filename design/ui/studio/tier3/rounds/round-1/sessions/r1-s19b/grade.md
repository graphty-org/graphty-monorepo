Grade: SD
False done: no
Wrong turns: 1
Route: folder

# Grade: r1-s19b (task T48 A, persona Sam, keyboard only)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Keyboard-only session (`keyboardOnlyMode: true`).
Leaks: none. `leaks.json` read the participant's log (65 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

## Against the success definition

T48 A asks for `volunteers.graphml`, the program's circles of people who do shifts together each
in its own color, the circle color kept only on people who finished food-safety training,
everyone else as when the file first opened, and how many people still carry a circle's color.

- Last screenshot `31.png`: the Louvain folder selected; Which nodes "15 of 24 nodes" with chips
  "Louvain: <<Layer>>" and "trained: yes, 15 nodes"; the key "Color: Louvain" with Group 1 to 3
  and "15 of 24 nodes"; Group 1 to 3 rows each read 5. The drawing shows orange, light blue and
  green dots, the rest indigo.
- `styles.json`: the three group layers of the Louvain run (`results.louvain.group` 0, 1, 2), each
  now `all` of its group and `data.trained` exact `true`, each matching and painting 5 nodes in its
  own color (`#e69f00`, `#56b4e9`, `#009e73`).
- `key.json` drawn: `#6366f1` 9, `#e69f00` 5, `#56b4e9` 5, `#009e73` 5. The three cluster colors
  are the ones the run drew at `13.png` (`styles-steps.jsonl`), so no cluster's color changed, and
  `#6366f1`, the only color after the file opened (`05.png`), is on the other 9.
- Answer: "15 people still have a circle's color (5 in each of the three circles)", read from
  "15 of 24 nodes" on Which nodes and the key and the group rows' 5s, on screen from `29.png`. It
  matches the drawn count (15).
- Stack: one `trained` card added on the folder's Which nodes, written to all three group layers:
  `Route: folder`.
- Analysis filter: typed `commun` (unprompted; the A prompt says "circles"). Quick actions was
  first tried with `communit`.

## Steps and wrong turns

Participant: 37 steps (one key, or one typed entry, is one step) from `01.png` to `31.png`:
Tab, Enter (Main menu), ArrowDown, Enter with the file, Enter (Load); `?`, Escape, Control+K,
`communit`, Control+A, `analy`, Enter (Analyze); `commun`, Enter (Louvain), Enter (Run); F6, 3 Tabs,
ArrowUp, ArrowRight, Enter (the folder); F6, 6 Tabs, Enter (Which nodes); Tab, Enter (Add a
condition), `trained`, Enter; Tab, Tab, Enter (Done). The key's path is 11 steps by pointer; by
keyboard the key counts 14 to 15 Tabs to "Open a file", 20 Tabs from the graph heading to Analyze
and 10 Tabs from the folder row to Which nodes, so the participant's menu-and-palette route was
shorter in presses than the key's Tab walk, and the folder part matched the key's route.

Wrong turns: 1. Step 8 (`08.png`): `communit` in Quick actions found nothing ("No results"), and
the participant cleared it and searched `analy` instead, a word taken from the Keyboard shortcuts
dialog (`06.png`). Graded SD: success after a wrong turn, recovered with the screen's help.

False done: no. The "Done" at step 31 matches `31.png` and the style tree.

## Problems

1. **The inspector's F6 stop shows no focus.** Severity 3, kind: build-defect (accessibility,
   WCAG 2.4.7). Step 21 (`21.png`): after F6 from the layer tree the row's ring is gone and nothing
   on screen shows where focus is; a Tab then landed on the inspector header's "Select what it
   paints" (`22.png`). Confirmed: the same stop with no focus in r1-s18 and its scripted repro
   `../../repro/r1-s18/commands.md` (step 8).
2. **After Load, focus is nowhere visible.** Severity 2, kind: accessibility. Step 5 (`05.png`):
   the graph opened, the preview dialog closed, and no ring is on any control; the participant
   used `?` and Control+K to find a way on. One session only, not yet scripted (see "Repro").
3. **Quick actions does not find analyses by what they find.** Severity 2, kind: behavior. Step 8
   (`08.png`): `communit` gives "No results", while the analysis list's own filter finds Louvain
   with `commun` (`11.png`) and the start page has a "Communities" button. Only the command name
   "Analyze" matched (`09.png`). Confirmed on a second task half: r1-s18's grade, problem 4.
4. **Which nodes is a long Tab walk from the inspector's top.** Severity 2, kind: behavior. Steps
   22-24 (`22.png` to `24.png`): 6 Tabs from the header (select-what-it-paints, menu, tabs, Node,
   Style nodes) to Which nodes, with no shortcut to the condition editor; the key records 10 Tabs
   from the folder row.
5. **The left panel's F6 stop is a faint outline.** Severity 1, kind: accessibility. Step 14
   (`14.png`): a thin dark frame around the panel header, which the participant had to look for.
6. **Arrowing the layer tree does not move the inspector.** Severity 1, kind: opinion. Steps 18-19
   (`18.png`, `19.png`): focus on the Louvain row left the inspector on the Graph; Enter was needed
   to select it. This is the usual tree pattern (focus is not selection); recorded because it
   surprised the participant.
7. **The Quick actions box's focus is weak.** Severity 1, kind: accessibility. Step 7 (`07.png`):
   the search box border darkens but carries no ring like other text boxes (`10.png`).

What worked: tooltips name the focused control (`02.png`, `16.png`, `22.png`); Enter on Louvain put
focus on Run (`12.png`); after Run focus went back to the Analyze button (`13.png`); the attribute
picker filters as typed and the yes/no card starts on Yes (`29.png`); after Done focus returned to
Which nodes (`31.png`).

## Repro

Problem 1 is confirmed by the existing repro `../../repro/r1-s18/commands.md`; problem 3 by r1-s18's
session on another task. Problem 2 is not scripted yet: a `real.mjs` walk for it never got a
browser slot (two other sessions held the queue) and was stopped before it started. The walk to
script: `--start <folder> empty --keys`; Tab, Enter, ArrowDown, Enter with `--upload
volunteers.graphml`; Enter (Load); then read the step's `focus:` line, which names the focused
control, and whether a ring shows on screen.
