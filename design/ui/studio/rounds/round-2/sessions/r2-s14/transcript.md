# Session r2-s14 -- Ruth (data journalist), task T10 Prompt A (Les Miserables)

Task: get every character's name written next to its dot, on the Les Miserables sample.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s14 empty`
Saw (01.png): a start page. Left: Open project or file, New from data. Middle: Recent projects (empty). Right: Samples -- Les Miserables (77 characters), Zachary's karate club, College football, Florentine families. A box at the bottom asks to share usage data. Top right: "Local only".
Next: decline the usage data first -- I do not share anything -- then open Les Miserables.

## Step 2 -- decline usage data

Command: `--step --click "No thanks"`
Next: open the Les Miserables sample.

## Step 3 -- open Les Miserables

Command: `--step --click "Les Miserables"`
Saw (03.png): the network drawn as purple dots and gray lines, no names anywhere. Right panel "Graph -- From Les Miserables" with tabs Style / Values; Values shows Nodes 77, Edges 254 -- 77 matches the "77 characters" on the start page, good. Left: a find box, "Selection", "Everything". Bottom toolbar: four icons (flask, a chart-like icon, "3D", magnifier).
Next: names are about how things look, so I will try the "Style" tab on the right.

## Step 4 -- Style tab of the graph

Command: `--step --click "Style"`
Saw (04.png): Style shows only Canvas (Background F5F5F5) and the layout Method "Force - Recommended", Shape 3D/2D, Spring length, Gravity, Advanced. Nothing about the dots or their names. Hesitated: this panel is about the whole picture, not the dots.
Next: on the left there is "Everything" under the find box. I want every dot, so I will click "Everything" and see if the right panel then talks about the dots.

## Step 5 -- Everything

Command: `--step --click "Everything"`
Saw (05.png): right panel now titled "Everything", Style tab with Nodes / Edges. Fill Color 6366F1, Shape Size 1, Icosphere, then three rows with a plus: Effects, Label, Tooltip. "Label" is exactly the word I want.
Next: click the plus beside "Label".

## Step 6 -- Add label line

Command: `--step --click-at 1419,362` (tool: button "Add label line")
Saw (06.png): a "Label" picker opened with a search box and two attributes, "id" and "name". A row "Pick an attribute" appeared under Label. No names on the drawing yet.
Next: I want the character's name, so pick "name" (not "id", which may be a code).

## Step 7 -- pick "name"

Command: `--step --click "name"`
Saw (07.png): names are now written above the dots (Blacheville, Fameuil, Myriel, Napoleon, Cravatte, Old Man...). They are very small in the middle cluster. The Label row reads "Aa Above | Abc name", and under it: "77 labels, 7 hidden to avoid overlap". Good that it tells me, but the task is every name. 77 matches the 77 characters; 7 are not shown. Which 7? The screen does not say.
Next: look for a way to show all of them. I will try the "Aa" bit of the Label row, which looks like text settings.

## Step 8 -- "Aa" is label position

Command: `--step --click-at 1220,392` (tool: button "Label position")
Saw (08.png): a small "Label position" popover with a 3x3 grid of dots (above-center selected). Only where the name sits, nothing about hidden ones.
Next: close it and try clicking the note "77 labels, 7 hidden to avoid overlap" itself, in case it lets me show them.

## Step 9 -- click the "7 hidden" note

Command: `--step --key Escape --click-at 1286,417` (tool: group "Label")
Saw (09.png): nothing changed. The note is just text; nothing offers "show all".
Next: maybe the hidden ones are hidden only because the dots are crowded. Zoom in on the dense middle with the mouse wheel and see whether more names appear and the count changes.

## Step 10 -- zoom in a little

Command: `--step --wheel 700,420,-600`
Saw (10.png): zoomed in only a bit. Names a little bigger. Still "77 labels, 7 hidden to avoid overlap". I can see dots with no name next to them, e.g. the one below-left of the middle (about 607,501) and the one right of Bamatabois (about 912,410).
Next: zoom in much more on the dense center and check whether the count drops.

## Step 11 -- zoom in more

Command: `--step --wheel 700,420,-2000`
Saw (11.png): bigger names, and the note now says "77 labels, 5 hidden to avoid overlap" -- so zooming does reveal some (Gillenormand and Mlle Gillenormand now have names). Still some unnamed dots: right of Bamatabois (about 937,401), the one at about 735,357, and Labarre's neighbor shows only "Mm" cut short. Top of the drawing is now cut off.
Next: zoom right into the crowded middle to see if the count reaches 0 there.

## Step 12 -- zoom in more

Command: `--step --wheel 680,400,-3000`
Saw (12.png): only a little more zoom, and the note is back to "7 hidden". So zooming does not steadily reveal them -- 7, then 5, now 7 again. Unnamed dots still: about 732,339 (big one in the middle), 698,379, 965,390 (right of Bamatabois), 828,624 (shown only as "Mme" cut off), 660,630 beside Mme Magloire. Hesitation: the count moves and I cannot tell which names are missing.
Next: try the "Abc name" box in the Label row, in case it holds text size or a "show all" option.

## Step 13 -- "Abc name" box

Command: `--step --click-at 1348,392` (tool: button "Label, Above: name")
Saw (13.png): only the attribute picker again ("In use: name", "Attributes: id"). No size, no "show all".
Next: close it and hover the "hidden to avoid overlap" note to see if it explains itself.

## Step 14 -- hover the note

Command: `--step --key Escape --hover-at 1286,417`
Saw: tooltip: null. The note does not explain itself or say which 7.
Next: the drawing is 3D, so dots may sit in front of each other. Try the "3D" button in the bottom toolbar to flatten it to 2D.

## Step 15 -- View menu

Command: `--step --click-at 767,864` (tool: button "View")
Saw (15.png): a View menu: 2D / 3D (checked), VR/AR (not available), Fit, Frame selection, Front/Side/Top/Isometric, Show Legend (checked), Table.
Next: pick "2D" so dots stop sitting behind each other, then check the hidden count.

## Step 16 -- 2D

Command: `--step --click "2D"`
Saw (16.png): the drawing is redrawn flat, and the note now reads "77 labels, 0 hidden to avoid overlap". Every dot I look at has a name above it (Mother Plutarch, Myriel, Napoleon, Count, Jondrette, Child 1, Child 2...). The names are very small at this size -- hard to read without leaning in.
Next: zoom in on the busy upper-right group to check the names are really there and readable, and that the count stays at 0.

## Step 17 -- zoom in 2D

Command: `--step --wheel 880,300,-1500`
Saw (17.png): zoomed only slightly; the names stay tiny (the text does not grow much), and a few on the left and right edges are now cut off by the window. Note still "0 hidden". Every dot I can see has a name.
Next: put the whole drawing back in view with "Fit" (the View menu said the key is 0) and check the count once more.

## Step 18 -- click canvas, press 0 for Fit

Command: `--step --click-at 750,450 --key 0`
Saw (18.png): the opposite of what I wanted. The canvas now shows one huge gray diagonal band -- it looks like it zoomed right into a single line. No dots, no names. "Fit" by its key did not fit. Note still says "0 hidden".
Next: try "Fit" from the View menu itself instead of the key.

## Step 19 -- View menu, Fit

Command: `--step --click-at 767,864 --click "Fit"`
Saw (19.png): the same gray band. "Fit" from the menu did not bring the drawing back either. Hesitation: I have lost the picture I had.
Next: zoom out with the mouse wheel.

## Step 20 -- zoom out

Command: `--step --wheel 750,450,5000`
Saw (20.png): barely changed; the band is a hair thinner. Wheel-out at this point does almost nothing.
Next: switching to 2D redrew the whole picture earlier, so try View -> 3D then View -> 2D to get the full drawing back.

## Step 21 -- 3D then 2D

Command: `--step --click-at 767,864 --click "3D" --click-at 767,864 --click "2D"`
Saw (21.png): the whole drawing is back, flat, every dot with its name above it, and the Label note says "77 labels, 0 hidden to avoid overlap". 77 is the number of characters the start page promised. That is the task done.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s14`

## Verdict (in character)

Did I finish? Yes. Every one of the 77 characters has its name next to its dot, and the panel itself tells me "77 labels, 0 hidden". I can take that count to an editor.

Ease: 4 out of 7.

What worked: once I clicked "Everything", the panel had a row literally called "Label" with a plus, and the picker offered "name". Three clicks and names appeared. The "77 labels, 7 hidden to avoid overlap" note was honest -- it told me the job was not done instead of letting me think it was.

What confused me:

- Nothing on the first screen said that to style the dots I must first click "Everything" on the left. The "Style" tab I opened first only had the background and the layout.
- "7 hidden to avoid overlap" -- which 7? It never named them, it is not clickable, it has no tooltip, and there is no "show all names" switch. I had to guess.
- Zooming in changed the number from 7 to 5 and then back to 7. A count that moves when I zoom is a count I cannot rely on.
- What finally got every name shown was switching the view to 2D -- under a toolbar button labeled "3D", in a menu about camera views. I found it by luck, reasoning that flat dots cannot sit behind each other. Nothing pointed me there from the label note.
- The names are tiny at the full-drawing size; zooming barely makes them bigger. An editor could not read this picture without a magnifier.
- "Fit" (key 0, and the menu item) threw me into a giant close-up of a single gray line instead of fitting the drawing, and the wheel would not zoom back out. Only switching 3D and back to 2D brought the picture back.
