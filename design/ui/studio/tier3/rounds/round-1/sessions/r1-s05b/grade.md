# Grade: r1-s05b (task T39 A, persona Sam, keyboard only)

Grade: SD
False done: no
Wrong turns: 3

Participant model: claude-opus-5-5 (all 181 model lines in the participant log say Opus; not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build,
viewport 1440 x 900, keyboard only (`keyboardOnlyMode: true`, started `empty --keys`).

## Result

- Last screenshot (36.png): Les Miserables, all 77 nodes dark green, ties light gray, the
  Everything layer open on Style > Node with Fill Color `006400` and "Everything styles all 77
  nodes", top bar "Autosave: saved".
- Style tree (`styles.json`): Everything's node row `everything_2` sets `node.color: #006400`
  (matched 77, painted 77). Everything's edge row `everything_1` still sets
  `edge.color: darkgrey`, width 8, solid, on 254 ties. No other layer paints node color.
  `key.json` draws nodes `#006400` x 77 and edges `#a9a9a9` x 254.
- Drawn hex `006400`. `colorWord("#006400")` = "dark green" (the CSS keyword table in
  compact-mantine's `color-utils.ts`), so the asked hue word "green" holds. The ties are unchanged.
- Stack: Everything's node color changed, which counts. Graded SD, not S. The final route is the
  key's, but the participant got there only after three wrong turns. One of them, Control+A on the
  color box's swatch button, was undone with the screen's help: Escape and the notice "Selection
  cleared: 77 nodes, 254 edges".
- Done claim: "every one of the 77 nodes is now dark green" matches the screen and the tree, so
  there is no false done.
- Merged: no (a sample only, no file).
- `styles-steps.jsonl`: the first screenshot where every node shows one new color is 36.png
  (`colors: ["#006400"]`). Screenshots 21 to 35 show the sample's own `#6366f1`, and 01 to 20
  show the start page's demo.

## Leak check

`leaks.json`, written at `--end`, found the participant's transcript (73 tool calls) and lists no
leak. The session is not VOID.

## Steps against the success path (key presses)

Each key press is one step, and each typed entry is one step. Totals: 38 key presses plus the
typed entry "Les" to open the sample, then 60 key presses plus the final typed entry to color the
nodes. That is about 100 steps to the first styled graph (36.png). Bar 4 does not count this
session, because Sam's key presses are another unit. This is bar 7's evidence.

The answer key's keyboard path takes about 59 steps:

- Samples is 16 Tabs from the top, plus Enter.
- The card is 16 more Tabs, plus Enter.
- Everything is 7 Shift+Tabs, plus Enter.
- F6 moves to the inspector, then 15 Tabs reach the color box.
- `darkgreen` and Enter set the color.

| Phase | Participant | Key |
|---|---|---|
| Open the sample | Header "Samples" link (3 keys). Then 4 Tabs through the header and 1 more, which left the library and went to the demo drawing at the top (07.png). WRONG TURN 1: the library route was abandoned and the participant walked to the start card's Samples button (Shift+Tab, 9 Tabs, Enter; 11.png, 12.png). Typing "Les" with focus left on that button did nothing (13.png). 3 Tabs reached the search box, "Les" filtered the cards, Enter did nothing, and 12 Tabs passed Grid, List and nine chips before Enter on the card (16.png to 21.png): 38 keys in all | 16 Tabs + Enter, 16 Tabs + Enter |
| Find the color | Tabbed into the inspector and opened the Graph's Style tab: Canvas and Labels only (24.png). WRONG TURN 2, abandoned. 7 Shift+Tabs + Enter on the Everything row (28.png), then 18 Tabs to the color box (31.png) | 7 Shift+Tabs + Enter, F6, 15 Tabs |
| Set the color | Control+A on the color box (focus on its swatch button) selected all 77 nodes and 254 edges, and the inspector became the selection's Values tab (32.png). WRONG TURN 3. Escape cleared the selection but left the Graph inspector (33.png), so the participant walked back: 7 Shift+Tabs + Enter, 18 Tabs + Enter, which opened the picker with its hex selected (35.png), then typed `006400` + Enter (36.png) | `darkgreen` + Enter |

## Problems

| Severity | Kind | Problem | Evidence |
|---|---|---|---|
| 2 | build-defect | Fill > Color has two Tab stops: the swatch button "Pick node color", then the hex text box. When the swatch has focus, the whole box gets the green focus border, the same border the text box gets, and no ring marks the swatch itself. So a keyboard user takes it for the text field. Control+A there is then, correctly for a button, the app's select-all: all 77 nodes and 254 edges are selected, the open layer's inspector becomes the selection's Values tab, and focus moves there. In the text box (one Tab on), Control+A stays the field's. The only difference on screen is whether the hex value is highlighted. Confirmed by a scripted repro | Step 32, 31.png and 32.png; repro `rounds/round-1/repro/r1-s05b/` 06.png, 07.png, 09.png, 10.png |
| 2 | behavior | Escape after a select-all clears the selection, but the inspector goes back to the Graph view and does not reopen the layer that was open before the selection, so a keyboard user walks back to it (8 keys, then 18 Tabs) | Step 33, 33.png ("Selection cleared: 77 nodes, 254 edges", Graph inspector on Style) |
| 3 | accessibility | "Samples", as the top-bar link or the start card's button, scrolls to the Sample library but leaves focus on the control, out of view. Typing goes nowhere. From the header link, the next Tab goes to the demo drawing and scrolls the page back to the top, so the library seems to have closed. The participant lost their place here (already recorded in the answer key's start-page notes) | Steps 4 to 7 (04.png to 07.png), steps 12 to 14 (12.png to 14.png) |
| 2 | accessibility | Long Tab walks and no visible way to jump between regions. The demo toolbar has 5 Tab stops, and the 9 category chips are 9 separate Tab stops before the first card. The bottom toolbar sits between the left and right panels, and the inspector has about 9 stops before Fill > Color (a link and a remove button on each property). F6 exists but nothing on screen shows it | Steps 10, 11, 19, 20, 29 to 31; wrap-up item 2 |
| 2 | accessibility | Enter on a layer row opens its inspector on the right, but focus stays on the row, so the reader must Tab through the whole bottom toolbar to reach what just opened | Steps 28 to 30, 28.png to 30.png |
| 2 | behavior | The Graph inspector's Style tab holds only Canvas and Labels, and nothing points to node color living in the "Everything" layer. This is the answer key's likely false finish; the participant noticed and backed out | Step 24, 24.png |
| 1 | behavior | Enter in "Search samples" with two cards left does nothing and does not move focus to the results, which are below the fold | Steps 16 and 17, 16.png and 17.png |
| 1 | accessibility | The focus ring on the start card's green "Samples" button is a darker green ring on a green fill, which is hard to see | Step 11, 11.png |

What worked: focus rings were visible on almost every control, and tooltips show shortcuts.
Enter on the color box opens the picker with its hex already selected, and Enter applies the
color, closes the picker and returns focus to the box (35.png, 36.png). The sample search filters
as the reader types, and Escape announces what it cleared.

## Repro

`rounds/round-1/repro/r1-s05b/` (`commands.md`), on the frozen build 758b8e8081:

- 06.png: the swatch "Pick node color" has focus, and the whole box shows the green border.
- 07.png: Control+A selects 77 nodes and 254 edges, and the inspector leaves the Everything layer.
- 08.png: Escape clears the selection but lands on the Graph inspector, not the layer.
- 09.png and 10.png: one Tab on, the hex text box has focus with the same border, and Control+A
  there selects nothing in the graph.

The mechanism: `isTypingTarget` (graphty/src/workspace/keys/keys.ts) rightly sends Control+A on a
button to the app. compact-mantine's CompactColorInput gives the swatch's focus the field's border
and no ring of its own.
