# Session r3-s18 -- Sam (keyboard-only analyst), task T10 prompt B (College football)

Task as given: "You have never used this program before. You will practice on the ready-made
network of American college football teams and the games they played, which comes with the
program, not on your own data. Right now no names are written on the drawing. Get every team's
name written next to its dot."

Rules I play by: keyboard only (--key and --type), no pointer at all. I count key presses.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s18 empty` -> 01.png

Sam: A start page. Start column (Open project or file, Ctrl+O hint; New from data), Recent
projects (empty), Samples on the right: Les Miserables, Zachary's karate club, College football
(115 teams), Florentine families. A data-sharing banner at the bottom. I see no focus ring
anywhere. I will press Tab and see where focus lands.

## Step 2 -- Tab (1 press)

Command: `--step ... --key Tab` -> 02.png

Sam: Good: a clear blue ring on the main menu button at the top left, and a tooltip "Main menu:
open, save, export, settings". The sample I want, College football, is far over on the right. I
will keep tabbing toward it. Next: Tab.

## Step 3 -- Tab (2 presses so far)

Command: `--step ... --key Tab` -> 03.png

Sam: Focus jumped to "Local only" at the top right, ring visible, tooltip about privacy. Fine.
Next Tab should go into the page body. Tab.

## Step 4 -- Tab (3 presses so far)

Command: `--step ... --key Tab` -> 04.png

Sam: Focus is on "Open project or file..." with a clear ring. Reading order looks like
top-to-bottom, left column first. I count: New from data, then probably Les Miserables, Karate
club, College football. I will press Tab four times and check where I land.

## Step 5 -- Tab x4 (7 presses so far)

Command: `--step ... --key Tab --key Tab --key Tab --key Tab` -> 05.png

Sam: Counted right: focus ring on the College football card. Seven Tabs from page load to the
sample -- acceptable, the order was predictable. Enter to open it.

## Step 6 -- Enter on College football (8 presses so far)

Command: `--step ... --key Enter` -> 06.png

Sam: The graph opened: 115 blue dots and grey lines, no names anywhere, as the task said. Left:
a find box, "Selection", "Everything". Right: a panel with "Style" and "Values" (Values is
selected, showing an overview: 115 nodes, 613 edges). A toolbar at the bottom with four icons.
Names on dots sounds like appearance, so "Style" is my guess. Problem: I cannot see where focus
is now. No ring anywhere on screen. I will press Tab once to find it.

## Step 7 -- Tab (9 presses so far)

Command: `--step ... --key Tab` -> 07.png

Sam: Focus is back on the main menu at the very top left. So after the sample opened, focus fell
to the page itself and I am starting the Tab walk again from the beginning. That is the "focus
falls to nowhere" problem: first strike. The Style tab is at the far right. No shortcut is
printed for it. I will keep tabbing: three presses, then look.

## Step 8 -- Tab x3 (12 presses so far)

Command: `--step ... --key Tab --key Tab --key Tab` -> 08.png

Sam: A tooltip "Nothing to redo" sits under the redo arrow, so focus must be on redo (a dimmed,
disabled-looking button) -- but I cannot actually see a ring on it; only the tooltip tells me.
Hesitation here. Keep going: four more Tabs.

## Step 9 -- Tab x4 (16 presses so far)

Command: `--step ... --key Tab --key Tab --key Tab --key Tab` -> 09.png

Sam: Ring on "Selection" in the left list. Sixteen Tabs and I am still on the left side of the
screen. The right panel's Style tab is probably another eight or ten away (Everything, the
drawing, the toolbar, then the panel). Four more.

## Step 10 -- Tab x4 (20 presses so far)

Command: `--step ... --key Tab --key Tab --key Tab --key Tab` -> 10.png

Sam: Now the ring is on the "From College football" link at the top of the right panel. The
bottom toolbar was skipped, or comes later; I do not know which. The Style tab is just below:
probably the "..." button, then Style. Two Tabs.

## Step 11 -- Tab x2 (22 presses so far)

Command: `--step ... --key Tab --key Tab` -> 11.png

Sam: Focus landed on the "Values" tab (ring visible), not on Style -- so the tabs are one stop
and arrows move inside them, as I expect. ArrowLeft to Style.

## Step 12 -- ArrowLeft (23 presses so far)

Command: `--step ... --key ArrowLeft` -> 12.png

Sam: Arrow moved to Style and opened it at once. Ring on Style. But this Style is for the whole
graph: Canvas background, a layout "Method" (Force), Shape 3D/2D, spring length, gravity,
Advanced. Nothing about names or labels. So the names must live with the dots themselves -- the
"Everything" row on the left looks like the thing that covers all dots. That means walking
back left. Shift+Tab three times to see what sits between Everything and this panel.

## Step 13 -- Shift+Tab x3 (26 presses so far)

Command: `--step ... --key Shift+Tab x3` -> 13.png

Sam: Focus is on the bottom toolbar's flask button, tooltip "Analyze Shift+A". So the toolbar is
one stop. Nice that the shortcut is printed. Not what I need, though. Two more Shift+Tabs
should reach "Everything".

## Step 14 -- Shift+Tab x2 (28 presses so far)

Command: `--step ... --key Shift+Tab x2` -> 14.png

Sam: Focus is on a tall blue bar along the right edge of the left panel -- a panel divider, I
think. No tooltip, so I cannot be sure. One more Shift+Tab.

## Step 15 -- Shift+Tab (29 presses so far)

Command: `--step ... --key Shift+Tab` -> 15.png

Sam: Back on "Selection". So "Selection" and "Everything" are one stop and arrows move between
them (that is why my earlier Tabs skipped Everything). ArrowDown to Everything, then Enter to
open it. Two keys in one step.

## Step 16 -- ArrowDown, Enter (31 presses so far)

Command: `--step ... --key ArrowDown --key Enter` -> 16.png

Sam: "Everything" is highlighted (focus ring and fill) and the right panel changed to it: Style /
Values, Nodes / Edges, Fill color 6366F1, Size, Shape Icosphere, Effects +, Label +, Tooltip +.
"Label" with a plus is exactly what I want. It is on the far side of the screen again, and focus
is still on the left. I will Tab toward it: the drawing, the divider and the toolbar are in the
way first. Four Tabs and look.

## Step 17 -- Tab x4 (35 presses so far)

Command: `--step ... --key Tab x4` -> 17.png

Sam: Ring on the "Style" tab of the Everything panel. Between here and Label + I count about ten
controls (Nodes/Edges, Fill +, color, opacity, link, size, link, shape, Effects +). Five Tabs.

## Step 18 -- Tab x5 (40 presses so far)

Command: `--step ... --key Tab x5` -> 18.png

Sam: Focus is in the opacity field ("100" selected). Forty key presses into this task and I have
not written a single name yet. I count six more stops to Label + (link, size, link, shape,
Effects +, Label +). Six Tabs.

## Step 19 -- Tab x6 (46 presses so far)

Command: `--step ... --key Tab x6` -> 19.png

Sam: Ring around the word "Label" itself -- it is a focusable thing on its own, separate from the
plus at the right. I am not sure whether Enter here expands it or does nothing. Try Enter.

## Step 20 -- Enter on Label (47 presses so far)

Command: `--step ... --key Enter` -> 20.png

Sam: Enter on "Label" did something useful: a "Label" box popped up beside the panel with a find
field ("Find an attribute") and three choices: id, label, value. "id" is highlighted. A row
"Pick an attribute" with a minus appeared in the panel behind it. I want the team's name. "label"
sounds most like a name; "id" might be a number. ArrowDown once to "label", then Enter.

## Step 21 -- ArrowDown, Enter on "label" (49 presses so far)

Command: `--step ... --key ArrowDown --key Enter` -> 21.png

Sam: That worked. Names are now written above the dots: Georgia, Florida, Maryland, Arizona,
WashingtonState, Stanford, California and so on (run-together like "NorthCarolinaState", but
readable). The popup closed and focus came back to a sensible spot -- a ring on a small "Aa"
button in the new Label row ("Aa Above", "Abc label", minus). Good: focus did not fall to
nowhere this time. But the panel says "115 labels, 14 hidden" and offers a "Show all labels"
checkbox. The task is EVERY team, so 14 hidden is not done. Some dense clusters in the middle
do look name-less. I will Tab toward the checkbox: three Tabs and look.

## Step 22 -- Tab x3 (52 presses so far)

Command: `--step ... --key Tab x3` -> 22.png

Sam: Counted right: the ring is on the "Show all labels" checkbox (small, but visible). Space to
tick it.

## Step 23 -- Space on "Show all labels" (53 presses so far)

Command: `--step ... --key Space` -> 23.png

Sam: The checkbox is ticked and the count under it now reads "115 labels" with no "hidden" part.
New names appeared in the crowded spots (SanDiegoState, Washington, ColoradoState, OregonState,
Louisiana-something). 115 teams, 115 labels: that is every team. Where dots are packed the names
sit on top of each other (OregonState over SouthernCalifornia, two names stacked near
SanDiegoState) and the small ones are hard to read at this zoom, but each dot has its name
written next to it, which is what I was asked. I am done. Focus stayed on the checkbox.

## End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s18`

## Debrief (Sam, in character)

**Did I finish?** Yes. Every one of the 115 teams has its name next to its dot ("115 labels",
nothing hidden). All of it from the keyboard; I never needed the trackball.

**Ease: 4 out of 7.** Every step worked from the keyboard, the focus ring was visible almost
everywhere, and the label picker behaved exactly like a list should (arrows, Enter, focus came
back to the new row). What cost me was distance: 53 key presses for what is two decisions
("show names", "show all of them"). About 30 of those were Tab walks across the screen.

Key presses by part:

- Open the College football sample: 8 (7 Tabs + Enter). Fine.
- Find where names live: 23 (first went to the graph's Style tab, which only has canvas and
  layout settings, then walked back to "Everything").
- Turn the names on: 18 (Tab walk from the left list to "Label" in the right panel, Enter,
  ArrowDown, Enter).
- Show the hidden 14: 4 (3 Tabs + Space).

**What confused or slowed me:**

- After the sample opened, focus fell to the page and my next Tab started at the main menu
  again. I had to walk the whole header and left panel a second time.
- No shortcut for the right-hand panel or for Style. The toolbar prints "Analyze Shift+A", which
  I liked; I looked for the same kind of hint for Style or Labels and found none.
- The graph-level Style tab (canvas, layout) and the "Everything" Style tab share a name. I
  guessed the first one and it had nothing about names. I only found Label by noticing that
  "Everything" probably meant "all the dots".
- "Selection" and "Everything" are one Tab stop with arrow keys between them. Correct, but
  nothing tells you; my Tabs skipped Everything and I only understood on the way back.
- The redo button showed its tooltip ("Nothing to redo") but I could not see a ring on it.
- A tall blue bar (a panel divider, I think) takes a Tab stop with no name or tooltip.
- The label picker offered "id", "label" and "value" with no hint which one holds the team name.
  I guessed "label" and it was right, but "id" was highlighted first.
- Turning labels on left 14 teams without names until I ticked a separate "Show all labels".
  The task said every team, so a first pass that quietly hides 14 is half done; I only knew
  because the count "115 labels, 14 hidden" was printed.
- With all names shown, several overlap in the crowded middle and are hard to read.
