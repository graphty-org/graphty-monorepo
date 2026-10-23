# Session r1-s09b -- Sam (keyboard only), prompt B: friends.csv

Participant: Sam, a sighted analyst who uses only the keyboard (wrist injury). He used keys and
typing only: no clicks, no pointing, no hovering. Start: the empty app. File: friends.csv.

All commands ran as `node tool/real.mjs --step rounds/round-1/sessions/r1-s09b ...` unless shown
otherwise.

## Part 1: get it on screen (2 key presses)

- 01.png, start screen. "Open project or file..." has a printed hint, Ctrl+O. Good -- I use it.
- `--key Control+o` -> 02.png, a file chooser opened.
- `--upload friends.csv` -> 03.png. The drawing is there: 20 dots, 41 arrows. The right panel
  says Nodes 20, Edges 41, Directed. The search box on the left seems to have focus (a light
  outline, not strong). The footer says "Analyze (Shift+A) to add results here" -- noted.
- "On screen. Two keys plus picking the file."

## Part 2: work out who matters most (4 key presses plus typing)

- `--key Shift+A` -> 04.png. I worried Shift+A would type a capital A into the search box. It
  did not: an Analyze list opened, its filter box focused with a clear blue ring. PageRank is
  marked "Start here", described as "Which nodes are connected to other well-connected nodes."
- `--type "pagerank" --key Enter` -> 05.png. A PageRank form: damping factor 0.85, a Run button.
  I could not tell for sure what had focus; the Run button looked brightest. I guessed.
- `--key Enter` -> 06.png. It ran. The dots are now orange to dark brown, a key at top left
  says "Color: Influence 0.04382 to 0.06608", and an "Influence 20" row appeared on the left.
  Focus went back to the Analyze button in the bottom bar, with a visible ring and its hint.
  "Done. Four keys. The app calls PageRank 'Influence' -- fine."

## Part 3: bigger dots for people who matter more (about 25 key presses; the hard part)

- `--key Control+k` -> 07.png. Ctrl+K opened a command list. I hoped to type "size".
- `--type "size"` -> 08.png. "No results." First dead end.
- `--key Escape --key / --key Tab` -> 09.png. "/" is listed as Find; Tab from the search box put
  a clear ring on "Selection" in the left list.
- `--key ArrowDown --key Enter` -> 10.png. "Influence" selected. The right panel now shows a
  Top 10 for Influence: Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan, Gus... Useful.
- `--key Tab` -> 11.png, focus on the row's eye icon ("Hide Influence").
- `--key Tab --key Tab` -> 12.png. **I cannot see focus anywhere.** Lost it.
- `--key Tab` -> 13.png. Focus is on the last button of the bottom bar ("Quick actions
  Ctrl+K"). One Tab press landed somewhere invisible, probably the drawing itself.
- `--key Tab` -> 14.png, the "from Influence, Oct 6" link at the top of the right panel.
- `--key Tab --key ArrowLeft` -> 15.png. Style tab. It lists Fill / Color: Influence, Shape,
  Effects, Label, Tooltip, each with a plus. No "Size" row; I guessed size lives under Shape.
- `--key Tab` x5 -> 16.png, on "Remove Color" (tooltip shown). I had to count blind.
- `--key Tab --key Enter` -> 17.png. The Shape plus opened a small menu: Size, Shape. Size
  already highlighted.
- `--key Enter` -> 18.png. A Size row appeared: "1", a chain-link icon, a minus. Focus vanished
  again.
- `--key Tab` -> 19.png. **Focus is on the main menu button at the very top left.** After
  choosing from the menu, focus was thrown back to the start of the page.
- `--key Shift+Tab --key Shift+Tab` -> 20.png. A thin blue line on the right panel's left edge;
  unclear what that is (a resize handle?).
- `--key Shift+Tab` -> 21.png, "Add Tooltip".
- `--key Shift+Tab` x4 -> 22.png, "Remove Size". One of those presses also landed somewhere I
  could not see.
- `--key Shift+Tab` -> 23.png, the chain icon: tooltip "Size by attribute". That is what I want,
  but nothing told me that before I landed on it.
- `--key Enter` -> 24.png. "Find an attribute" list: Influence, Influence rank, Influence
  percentile; "id" listed as cannot be used.
- `--key Enter` -> 25.png. Done: Ava and Farah are big and dark, the small ones pale. The key
  now has "Size: Influence" above "Color: Influence". The Size box says "1 to 3".
  "About 25 presses, two lost-focus moments. That hurts."

## Part 4: everyone's name on the drawing (6 key presses)

- `--key Tab` -> 26.png. **Focus is at the top-left main menu again** -- second time focus was
  thrown to the start.
- `--key Shift+Tab` x4 -> 27.png, "Add label line" (the Label plus).
- `--key Enter` -> 28.png. Attribute list with "id" at the top, highlighted.
- `--key Enter` -> 29.png. Names on every dot: Omar, Pia, Quinn, Ravi, Ava, Farah... The panel
  says "20 labels, 0 hidden to avoid overlap". A few names sit on top of arrows or each other at
  the bottom (Chloe over Farah, Eli and Dev), but they are all there.

## Part 5: picture file with its key (4 key presses plus typing)

- `--key Control+k --type "export"` -> 30.png. "Export..." with the hint Ctrl+E. Learned it.
- `--key Enter` -> 31.png. Export dialog: Image, PNG, 2x (1806 x 1720), current view, canvas
  color. The preview shows the key in its corner. Focus on the dialog's close button.
- `--key Shift+Tab` -> 32.png. Clear ring on the blue Export button.
- `--key Enter` -> 33.png. "Exported friends_current-view.png". Saved file:
  `downloads/friends_current-view.png`, 1806 x 1720. Opened it: the drawing, all names, and the
  key box at top left with both Size: Influence and Color: Influence, 0.04382 to 0.06608.
  Focus came back to the bottom bar with a visible ring.

`node tool/real.mjs --end rounds/round-1/sessions/r1-s09b`

## What the sizes and colors stand for (in Sam's words)

"Both the size and the color show the same thing: Influence, which is what the program calls
PageRank -- how well connected someone is to other well-connected people. Bigger and darker
means more. The range runs 0.04382 to 0.06608, so the spread is small. Farah and Ava are the
biggest; Hana and Ivan next."

## Debrief, in character

- **Finished?** Yes, every part, without the mouse. The PNG has the names and the key.
- **Difficulty:** 4 of 7. Opening, analyzing and exporting were quick and the shortcuts
  (Ctrl+O, Shift+A, Ctrl+K, Ctrl+E) are printed where I could learn them. Size and labels cost
  most of my key presses.
- **What confused or hurt:**
    1. Focus thrown back to the top-left main menu after choosing from a menu in the Style panel
       (after adding Size, and again after picking Size's attribute). Twice in one task is my
       abandon line; I only kept going because Shift+Tab wrapped me back near the panel.
    2. Tab stops with no visible focus: one between the left list and the bottom bar (the drawing,
       I think), one in the Style panel, and a thin unexplained blue line on the panel edge.
    3. No way to find "size" from Ctrl+K. It knows Export and Analyze but not styling.
    4. "Size" is hidden under "Shape", and "size by a value" is an unlabeled chain icon whose name
       I only saw once focus landed on it.
    5. In the PageRank form I could not tell whether Run had focus before pressing Enter.
    6. Minor: some names overlap at the bottom of the picture (Chloe and Farah, Eli and Dev).
- **Key presses, roughly:** on screen 2, analysis 4 plus typing, sizes about 25, names about 6,
  picture about 4 plus typing.
